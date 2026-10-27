use roxmltree::Node;

/// The steps from the root to `node`, each element named by `step`, joined by `/`.
pub fn path(node: Node, step: impl Fn(Node) -> String) -> String {
    let mut steps: Vec<String> = node
        .ancestors()
        .filter(Node::is_element)
        .map(step)
        .collect();
    steps.reverse();
    steps.join("/")
}
