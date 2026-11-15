use midiremap_core::{Canon, Note};

pub fn k(s: &str) -> Canon {
    s.parse().unwrap()
}

pub fn n(x: u8) -> Note {
    Note::new(x).expect("test note in range")
}
