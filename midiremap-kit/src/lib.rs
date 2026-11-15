//! The drum vocabulary and the engines that play it: what a drum is (`canon`), where one
//! kit's toms and cymbals play on another's (`spread`), and each engine's note table and the
//! catalog of them (`engine`). It never names `midly` or a MIDI event.
//!
//! The folders use each other in one order, lowest first. Cargo holds only the edges between
//! crates, so this order is held by review:
//!
//! - `non_blank` uses no other folder;
//! - `canon` uses no other folder;
//! - `spread` uses `canon`;
//! - `engine` uses `canon`, `spread` and `non_blank`.

#![warn(unreachable_pub)]

pub mod canon;
pub mod engine;
pub mod non_blank;
pub mod spread;
