use std::sync::LazyLock;

use midiremap_core::Catalog;

use crate::{
    i18n::{Docs, Messages},
    pages::Site,
};

static SITE: LazyLock<Site> = LazyLock::new(|| Site::build(&Catalog::builtin()).unwrap());
static MESSAGES: LazyLock<Messages> = LazyLock::new(Messages::load);
static DOCS: LazyLock<Docs> = LazyLock::new(|| Docs::load().unwrap());

/// The site built from the builtin catalog, once for every test.
pub fn site() -> &'static Site {
    &SITE
}

pub fn messages() -> &'static Messages {
    &MESSAGES
}

pub fn docs() -> &'static Docs {
    &DOCS
}
