use std::collections::BTreeSet;

use fluent_syntax::{ast, parser};

/// Every message in `ftl`, in file order, with the variables its value and attributes use.
pub fn message_vars(ftl: &str) -> Result<Vec<(&str, BTreeSet<&str>)>, Vec<parser::ParserError>> {
    let resource = parser::parse(ftl).map_err(|(_, errs)| errs)?;
    Ok(resource
        .body
        .into_iter()
        .filter_map(|e| match e {
            ast::Entry::Message(m) => {
                let mut vars = BTreeSet::new();
                if let Some(p) = &m.value {
                    pattern_vars(p, &mut vars);
                }
                m.attributes
                    .iter()
                    .for_each(|a| pattern_vars(&a.value, &mut vars));
                Some((m.id.name, vars))
            }
            _ => None,
        })
        .collect())
}

fn pattern_vars<'a>(pattern: &ast::Pattern<&'a str>, out: &mut BTreeSet<&'a str>) {
    for el in &pattern.elements {
        if let ast::PatternElement::Placeable { expression } = el {
            expression_vars(expression, out);
        }
    }
}

fn expression_vars<'a>(e: &ast::Expression<&'a str>, out: &mut BTreeSet<&'a str>) {
    match e {
        ast::Expression::Select { selector, variants } => {
            inline_vars(selector, out);
            variants.iter().for_each(|v| pattern_vars(&v.value, out));
        }
        ast::Expression::Inline(i) => inline_vars(i, out),
    }
}

fn inline_vars<'a>(i: &ast::InlineExpression<&'a str>, out: &mut BTreeSet<&'a str>) {
    match i {
        ast::InlineExpression::VariableReference { id } => {
            out.insert(id.name);
        }
        ast::InlineExpression::Placeable { expression } => expression_vars(expression, out),
        ast::InlineExpression::FunctionReference { arguments, .. }
        | ast::InlineExpression::TermReference {
            arguments: Some(arguments),
            ..
        } => {
            arguments
                .positional
                .iter()
                .for_each(|a| inline_vars(a, out));
            arguments
                .named
                .iter()
                .for_each(|a| inline_vars(&a.value, out));
        }
        _ => {}
    }
}
