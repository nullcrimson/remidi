const NAMES: [&str; 12] = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum OctaveBase {
    C1,
    C2,
}

impl OctaveBase {
    fn offset(self) -> i16 {
        match self {
            OctaveBase::C1 => 1,
            OctaveBase::C2 => 2,
        }
    }
}

pub fn note_name(note: u8, base: OctaveBase) -> String {
    let octave = i16::from(note / 12) - base.offset();
    format!("{}{octave}", NAMES[usize::from(note % 12)])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_app_note_names() {
        let cases = [
            (0, "C-1", "C-2"),
            (36, "C2", "C1"),
            (42, "F#2", "F#1"),
            (60, "C4", "C3"),
            (127, "G9", "G8"),
        ];
        for (note, c1, c2) in cases {
            assert_eq!(note_name(note, OctaveBase::C1), c1);
            assert_eq!(note_name(note, OctaveBase::C2), c2);
        }
    }
}
