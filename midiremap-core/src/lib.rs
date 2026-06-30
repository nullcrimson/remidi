pub mod canon;
pub mod map;
pub mod registry;
pub mod remap;

pub use canon::{fallbacks, Canon};
pub use map::{EngineMap, MapError};
pub use registry::{builtin, Registry};
pub use remap::{remap, RemapError, RemapOutput, Report};

#[cfg(test)]
mod tests {
    #[test]
    fn workspace_builds() {
        assert_eq!(2 + 2, 4);
    }
}
