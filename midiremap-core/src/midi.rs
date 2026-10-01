use std::error::Error;

use midly::{MidiMessage, Smf};

/// Where the timing division starts in an `MThd` chunk's data, after format and track count.
const MTHD_DIVISION: usize = 4;
/// The SMPTE frame-rate byte midly cannot read.
const SMPTE_MINUS_128: u8 = 0x80;

#[derive(thiserror::Error, Debug)]
pub enum CodecError {
    #[error("MIDI parse error")]
    Parse(#[source] Box<dyn Error + Send + Sync>),
    #[error("invalid SMPTE frame rate -128")]
    SmpteRate,
    #[error("removed notes leave a gap longer than a MIDI delta time can hold")]
    DeltaOverflow,
    #[error("MIDI write error")]
    Write(#[source] std::io::Error),
}

pub(crate) fn parse(bytes: &[u8]) -> Result<Smf<'_>, CodecError> {
    if has_smpte_rate_minus_128(bytes) {
        return Err(CodecError::SmpteRate);
    }
    Smf::parse(bytes).map_err(|e| CodecError::Parse(Box::new(e)))
}

/// Whether any header chunk has SMPTE rate byte `0x80`, which midly 0.5.3 negates with an
/// overflow (a panic when overflow checks are on) wherever it reads a header. No real
/// frame rate uses it.
fn has_smpte_rate_minus_128(bytes: &[u8]) -> bool {
    smf_body(bytes).is_some_and(|smf| {
        chunks(smf, Chunking::Smf)
            .any(|(id, data)| id == b"MThd" && data.get(MTHD_DIVISION) == Some(&SMPTE_MINUS_128))
    })
}

/// The SMF in `bytes`: the file itself, or an RMID file's first `data` chunk, found the
/// way midly finds it.
fn smf_body(bytes: &[u8]) -> Option<&[u8]> {
    if !bytes.starts_with(b"RIFF") {
        return Some(bytes);
    }
    let (_, riff) = chunks(bytes, Chunking::Riff).next()?;
    let inner = riff.strip_prefix(b"RMID")?;
    chunks(inner, Chunking::Riff).find_map(|(id, data)| (id == b"data").then_some(data))
}

#[derive(Clone, Copy)]
enum Chunking {
    Smf,
    Riff,
}

/// `(id, data)` chunks as midly splits them: a short chunk runs to the end of the input,
/// RIFF lengths are little-endian and odd ones padded.
fn chunks(mut raw: &[u8], chunking: Chunking) -> impl Iterator<Item = (&[u8; 4], &[u8])> {
    std::iter::from_fn(move || {
        let (id, rest) = raw.split_first_chunk::<4>()?;
        let (len, rest) = rest.split_first_chunk::<4>()?;
        let len = usize::try_from(match chunking {
            Chunking::Smf => u32::from_be_bytes(*len),
            Chunking::Riff => u32::from_le_bytes(*len),
        })
        .ok()?;
        let (data, rest) = rest.split_at_checked(len).unwrap_or((rest, &[]));
        raw = match chunking {
            Chunking::Riff if len % 2 == 1 => rest.get(1..).unwrap_or_default(),
            _ => rest,
        };
        Some((id, data))
    })
}

pub(crate) fn write(smf: &Smf) -> Result<Vec<u8>, CodecError> {
    let mut bytes = Vec::new();
    smf.write_std(&mut bytes).map_err(CodecError::Write)?;
    Ok(bytes)
}

/// Whether `message` sounds a note: a note-on with nonzero velocity.
pub(crate) fn is_hit(message: &MidiMessage) -> bool {
    matches!(message, MidiMessage::NoteOn { vel, .. } if vel.as_int() > 0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn riff(smf: &[u8]) -> Vec<u8> {
        let len = |n: usize| u32::try_from(n).unwrap().to_le_bytes();
        let mut riff = b"RIFF".to_vec();
        riff.extend(len(12 + smf.len()));
        riff.extend(b"RMIDdata");
        riff.extend(len(smf.len()));
        riff.extend(smf);
        riff
    }

    #[test]
    fn an_smpte_rate_of_minus_128_is_an_error() {
        let smf = |timing: &[u8]| {
            [
                b"MThd\0\0\0\x06\0\0\0\x01".as_slice(),
                timing,
                b"MTrk\0\0\0\x04\0\xff\x2f\0",
            ]
            .concat()
        };
        let (bad, good) = (smf(b"\x80\xe0"), smf(b"\xe7\x28"));
        assert!(parse(&good).is_ok());
        assert!(parse(&riff(&good)).is_ok());
        assert!(matches!(parse(&bad), Err(CodecError::SmpteRate)));
        assert!(matches!(parse(&riff(&bad)), Err(CodecError::SmpteRate)));
        let later = [good.as_slice(), b"MThd\0\0\0\x06\0\0\0\x01\x80\xe0"].concat();
        assert!(parse(&later).is_err());
    }

    #[test]
    fn codec_errors_keep_their_cause() {
        let err = parse(b"garbage").unwrap_err();
        assert_eq!(err.to_string(), "MIDI parse error");
        assert!(err.source().is_some_and(|e| !e.to_string().is_empty()));
    }
}
