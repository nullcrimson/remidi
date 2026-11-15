//! A standard MIDI file as bytes, tracks and channels (`midi`), and the parts of a file and
//! what a selection selects in it (`parts`). It never names a drum.
//!
//! The folders use each other in one order, lowest first. Cargo holds only the edges between
//! crates, so this order is held by review:
//!
//! - `midi` uses no other folder;
//! - `parts` uses `midi`.

#![warn(unreachable_pub)]

pub mod midi;
pub mod parts;
