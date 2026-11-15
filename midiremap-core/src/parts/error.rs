use super::part::Part;
use crate::midi::CodecError;

/// Why converting a file, or reading the hits converting it would rewrite, failed.
#[derive(thiserror::Error, Debug)]
pub enum ConvertError {
    #[error(transparent)]
    Codec(#[from] CodecError),
    #[error("the file has no notes on channel {} of track {}", .0.channel, .0.track)]
    NoSuchPart(Part),
}
