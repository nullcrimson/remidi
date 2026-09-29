use crate::{content::Block, i18n::*};

fn shape(blocks: &[Block]) -> Vec<String> {
    blocks.iter().map(Block::shape).collect()
}

fn blocks(json: &str) -> Vec<Block> {
    serde_json::from_str(json).unwrap()
}

#[test]
fn a_moved_link_changes_the_shape() {
    assert_ne!(
        shape(&blocks(r#"[{ "p": [{ "text": "a", "href": "/faq/" }] }]"#)),
        shape(&blocks(
            r#"[{ "p": [{ "text": "a", "href": "/terms/" }] }]"#
        )),
    );
}

#[test]
fn a_dropped_step_changes_the_shape() {
    assert_ne!(
        shape(&blocks(
            r#"[{ "steps": [{ "title": "a", "body": "b" }, { "title": "c", "body": "d" }] }]"#
        )),
        shape(&blocks(r#"[{ "steps": [{ "title": "a", "body": "b" }] }]"#)),
    );
}

#[test]
fn reworded_text_keeps_the_shape() {
    assert_eq!(
        shape(&blocks(
            r#"[{ "p": ["one", { "text": "two", "href": "/faq/" }] }]"#
        )),
        shape(&blocks(
            r#"[{ "p": ["uno", { "text": "dos", "href": "/faq/" }] }]"#
        )),
    );
}

#[test]
fn every_locale_matches_english() {
    let docs = Docs::load().unwrap();
    for &l in Locale::ALL {
        for &k in SectionKey::ALL {
            if let Some(b) = docs.blocks(l, k) {
                assert_eq!(
                    shape(b),
                    shape(docs.blocks(Locale::En, k).unwrap()),
                    "{} {}",
                    l.code(),
                    k.key()
                );
            }
        }
    }
}

#[test]
fn english_has_every_section() {
    let docs = Docs::load().unwrap();
    for &k in SectionKey::ALL {
        assert!(docs.has(Locale::En, k), "{}", k.key());
    }
}
