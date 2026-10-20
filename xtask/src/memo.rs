use std::{
    collections::BTreeMap,
    fs,
    io::{self, ErrorKind},
    path::{Path, PathBuf},
    process::Command,
};

use anyhow::{bail, Context as _, Result};
use serde::{Deserialize, Serialize};
use walkdir::WalkDir;

use crate::step::Reads;

/// A hash of files: what a step read (with the toolchains), or a build directory it wrote.
/// Two runs with the same fingerprint read the same thing.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Fingerprint(String);

/// A kept pass: what it read, and for a build the directory it left.
#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
struct Pass {
    read: Fingerprint,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    left: Option<Fingerprint>,
}

/// Whether a run trusts the checks that passed before, and whether it keeps the ones that
/// pass now.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Policy {
    /// A local full run: skips a check that passed with the same fingerprint, keeps new passes.
    Reuse,
    /// `--fresh`: runs every check, keeps new passes.
    Fresh,
    /// The quick gate: skips a check the full gate passed, keeps nothing, since its checks
    /// cover only what changed.
    ReadOnly,
    /// CI: runs every check and keeps nothing.
    Off,
}

impl Policy {
    pub fn reads(self) -> bool {
        matches!(self, Policy::Reuse | Policy::ReadOnly)
    }

    pub fn writes(self) -> bool {
        matches!(self, Policy::Reuse | Policy::Fresh)
    }
}

/// The passes kept between runs in `target/gate/passes.json`, by key: a check's step name,
/// or the name of the build directory the builds that write it share.
pub struct Passes {
    path: PathBuf,
    passed: BTreeMap<String, Pass>,
}

impl Passes {
    /// The passes kept at `path`; none when the file is missing or unreadable, which only
    /// makes the next run check more.
    pub fn load(path: PathBuf) -> Self {
        let passed = fs::read_to_string(&path)
            .ok()
            .and_then(|text| serde_json::from_str(&text).ok())
            .unwrap_or_default();
        Self { path, passed }
    }

    /// Whether `key` passed having read `read` and, for a build, left `left`.
    pub fn has(&self, key: &str, read: &Fingerprint, left: Option<&Fingerprint>) -> bool {
        self.passed
            .get(key)
            .is_some_and(|p| p.read == *read && p.left.as_ref() == left)
    }

    /// Keeps `key`'s pass, or forgets it when the step failed.
    pub fn record(
        &mut self,
        key: &str,
        read: Fingerprint,
        left: Option<Fingerprint>,
        passed: bool,
    ) -> Result<()> {
        if passed {
            self.passed.insert(key.to_owned(), Pass { read, left });
        } else {
            self.passed.remove(key);
        }
        let json = serde_json::to_string_pretty(&self.passed)?;
        fs::write(&self.path, json + "\n")
            .with_context(|| format!("cannot write {}", self.path.display()))
    }
}

/// The source files under `pathspecs` that git sees: tracked ones, deleted ones included,
/// and untracked ones it does not ignore.
fn sources(root: &Path, pathspecs: &[&str]) -> Result<Vec<String>> {
    if pathspecs.is_empty() {
        return Ok(Vec::new());
    }
    let out = Command::new("git")
        .args([
            "ls-files",
            "-z",
            "--cached",
            "--others",
            "--exclude-standard",
            "--",
        ])
        .args(pathspecs)
        .current_dir(root)
        .output()
        .context("cannot run git ls-files")?;
    if !out.status.success() {
        bail!(
            "git ls-files failed: {}",
            String::from_utf8_lossy(&out.stderr).trim()
        );
    }
    let mut files: Vec<String> = String::from_utf8(out.stdout)
        .context("git ls-files printed a path that is not UTF-8")?
        .split('\0')
        .filter(|f| !f.is_empty())
        .map(str::to_owned)
        .collect();
    files.sort();
    files.dedup();
    Ok(files)
}

/// Every file under the build outputs `paths`, a missing output being no files.
fn built(root: &Path, paths: &[&str]) -> Result<Vec<String>> {
    let mut files = Vec::new();
    for path in paths {
        for entry in WalkDir::new(root.join(path)) {
            let entry = match entry {
                Ok(entry) => entry,
                Err(e) if e.io_error().map(io::Error::kind) == Some(ErrorKind::NotFound) => {
                    continue
                }
                Err(e) => return Err(e).context(format!("cannot list {path}")),
            };
            if entry.file_type().is_file() {
                let relative = entry
                    .path()
                    .strip_prefix(root)
                    .expect("a walked path lies under the root it started from");
                files.push(relative.to_string_lossy().replace('\\', "/"));
            }
        }
    }
    files.sort();
    Ok(files)
}

fn hash_file(hasher: &mut blake3::Hasher, root: &Path, file: &str) -> Result<()> {
    hasher.update(file.as_bytes());
    hasher.update(&[0]);
    match fs::read(root.join(file)) {
        Ok(bytes) => {
            hasher.update(&(bytes.len() as u64).to_le_bytes());
            hasher.update(&bytes);
        }
        Err(e) if e.kind() == ErrorKind::NotFound => {
            hasher.update(b"missing");
        }
        Err(e) => return Err(e).context(format!("cannot read {file}")),
    }
    Ok(())
}

/// What the files under the build directory `path` hold now.
pub fn left(root: &Path, path: &str) -> Result<Fingerprint> {
    let mut hasher = blake3::Hasher::new();
    for file in built(root, &[path])? {
        hash_file(&mut hasher, root, &file)?;
    }
    Ok(Fingerprint(hasher.finalize().to_hex().to_string()))
}

/// The fingerprint of what `key` reads (`reads` under `root`) with `toolchains`.
pub fn fingerprint(root: &Path, key: &str, reads: &Reads, toolchains: &str) -> Result<Fingerprint> {
    let mut hasher = blake3::Hasher::new();
    hasher.update(key.as_bytes());
    hasher.update(&[0]);
    hasher.update(toolchains.as_bytes());
    hasher.update(&[0]);
    for file in sources(root, reads.sources)?
        .iter()
        .chain(&built(root, reads.built)?)
    {
        hash_file(&mut hasher, root, file)?;
    }
    Ok(Fingerprint(hasher.finalize().to_hex().to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scratch(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("xtask-memo-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn print(root: &Path) -> Fingerprint {
        let reads = Reads {
            sources: &[],
            built: &["out"],
        };
        fingerprint(root, "e2e", &reads, "tools").unwrap()
    }

    #[test]
    fn a_changed_build_output_changes_the_fingerprint() {
        let root = scratch("changed");
        fs::create_dir_all(root.join("out")).unwrap();
        fs::write(root.join("out/a.html"), "one").unwrap();
        let before = print(&root);
        assert_eq!(print(&root), before);
        fs::write(root.join("out/a.html"), "two").unwrap();
        assert_ne!(print(&root), before);
    }

    #[test]
    fn a_missing_build_output_hashes_as_empty() {
        let root = scratch("missing");
        let empty = print(&root);
        fs::create_dir_all(root.join("out")).unwrap();
        fs::write(root.join("out/a.html"), "one").unwrap();
        assert_ne!(print(&root), empty);
    }

    #[test]
    fn the_toolchains_are_part_of_the_fingerprint() {
        let root = scratch("tools");
        let reads = Reads {
            sources: &[],
            built: &[],
        };
        assert_ne!(
            fingerprint(&root, "vitest", &reads, "node 24").unwrap(),
            fingerprint(&root, "vitest", &reads, "node 25").unwrap()
        );
    }

    #[test]
    fn a_pass_is_kept_and_a_failure_forgets_it() {
        let root = scratch("passes");
        let path = root.join("passes.json");
        let fp = Fingerprint("abc".to_owned());
        let mut passes = Passes::load(path.clone());
        assert!(!passes.has("tsc", &fp, None));
        passes.record("tsc", fp.clone(), None, true).unwrap();
        assert!(Passes::load(path.clone()).has("tsc", &fp, None));
        assert!(!Passes::load(path.clone()).has("tsc", &Fingerprint("abd".to_owned()), None));
        passes.record("tsc", fp.clone(), None, false).unwrap();
        assert!(!Passes::load(path).has("tsc", &fp, None));
    }

    #[test]
    fn a_kept_build_holds_only_while_its_directory_is_as_it_left_it() {
        let root = scratch("left");
        fs::create_dir_all(root.join("dist")).unwrap();
        fs::write(root.join("dist/index.html"), "built").unwrap();
        let read = Fingerprint("inputs".to_owned());
        let mut passes = Passes::load(root.join("passes.json"));
        passes
            .record(
                "dist",
                read.clone(),
                Some(left(&root, "dist").unwrap()),
                true,
            )
            .unwrap();
        assert!(passes.has("dist", &read, Some(&left(&root, "dist").unwrap())));
        fs::remove_file(root.join("dist/index.html")).unwrap();
        assert!(!passes.has("dist", &read, Some(&left(&root, "dist").unwrap())));
    }

    #[test]
    fn only_a_local_full_run_and_a_fresh_one_keep_passes() {
        assert!(Policy::Reuse.reads() && Policy::Reuse.writes());
        assert!(!Policy::Fresh.reads() && Policy::Fresh.writes());
        assert!(Policy::ReadOnly.reads() && !Policy::ReadOnly.writes());
        assert!(!Policy::Off.reads() && !Policy::Off.writes());
    }
}
