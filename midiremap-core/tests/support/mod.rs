use midiremap_core::Canon;
pub use midiremap_note::n;

pub fn k(s: &str) -> Canon {
    s.parse().unwrap()
}
