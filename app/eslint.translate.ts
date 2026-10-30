import type { ESLint, Linter } from 'eslint';
import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import reactGoogleTranslate from 'eslint-plugin-react-google-translate';
import ts from 'typescript';

type Parent = TSESTree.JSXElement | TSESTree.JSXFragment;
type Child = Parent['children'][number];
type FunctionNode = TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression;

const TEXT_TYPES = ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.BigIntLike | ts.TypeFlags.Any | ts.TypeFlags.Unknown;

function remembered(test: (type: ts.Type) => boolean) {
  const known = new Map<ts.Type, boolean>();
  return (type: ts.Type) => {
    const seen = known.get(type);
    if (seen !== undefined) return seen;
    known.set(type, false);
    const result = test(type);
    known.set(type, result);
    return result;
  };
}

function textTypes(checker: ts.TypeChecker) {
  const constraintOf = (type: ts.Type) => (type.isTypeParameter() ? checker.getBaseConstraintOfType(type) : undefined);
  const isText: (type: ts.Type) => boolean = remembered((type) => {
    const constraint = constraintOf(type);
    return (type.flags & TEXT_TYPES) !== 0
      || (type.isUnionOrIntersection() && type.types.some(isText))
      || (constraint !== undefined && isText(constraint));
  });
  const isTextList: (type: ts.Type) => boolean = remembered((type) => {
    const constraint = constraintOf(type);
    if (type.isUnion()) return type.types.some(isTextList);
    if (constraint !== undefined) return isTextList(constraint);
    const item = checker.getIndexTypeOfType(type, ts.IndexKind.Number);
    return !isText(type) && item !== undefined && (isText(item) || isTextList(item));
  });
  const canBeText = (type: ts.Type) => isText(type) || isTextList(type);
  return { canBeText, isTextList };
}

const isFragment = (parent: Parent) => {
  if (parent.type === 'JSXFragment') return true;
  const name = parent.openingElement.name;
  return (name.type === 'JSXIdentifier' && name.name === 'Fragment')
    || (name.type === 'JSXMemberExpression' && name.property.name === 'Fragment');
};

const isRendered = (child: Child) =>
  !(child.type === 'JSXText' && /^\s*$/.test(child.value) && child.value.includes('\n'))
  && !(child.type === 'JSXExpressionContainer' && child.expression.type === 'JSXEmptyExpression');

const isFunction = (node: TSESTree.Node): node is FunctionNode =>
  node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';

function enclosingFunction(node: TSESTree.Node): FunctionNode | null {
  for (let at = node.parent; at !== undefined; at = at.parent) if (isFunction(at)) return at;
  return null;
}

function isComponent(fn: FunctionNode | null) {
  if (fn === null) return false;
  const id = fn.type === 'FunctionDeclaration' ? fn.id : fn.parent.type === 'VariableDeclarator' ? fn.parent.id : null;
  return id?.type === 'Identifier' && /^[A-Z]/.test(id.name);
}

const textInOwnElement = ESLintUtils.RuleCreator.withoutDocs({
  meta: {
    type: 'problem',
    messages: {
      wrap: 'Put this text in its own element: browser translation replaces the text nodes React keeps, so React fails when it moves or removes them.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    const { canBeText, isTextList } = textTypes(services.program.getTypeChecker());
    const typedText = (node: TSESTree.Node) => canBeText(services.getTypeAtLocation(node));
    const isListOfText = (child: Child) =>
      child.type === 'JSXExpressionContainer' && child.expression.type !== 'JSXEmptyExpression'
      && isTextList(services.getTypeAtLocation(child.expression));
    const isText = (child: Child) => {
      if (child.type === 'JSXText') return true;
      if (child.type !== 'JSXExpressionContainer' || child.expression.type === 'JSXEmptyExpression') return false;
      return typedText(child.expression);
    };
    const check = (parent: Parent) => {
      const rendered = parent.children.filter(isRendered);
      const alone = rendered.length === 1 && !isFragment(parent);
      rendered.filter(alone ? isListOfText : isText).forEach((node) => context.report({ node, messageId: 'wrap' }));
    };
    const checkReturned = (node: TSESTree.Node, fn: FunctionNode | null) => {
      if (isComponent(fn) && typedText(node)) context.report({ node, messageId: 'wrap' });
    };
    return {
      JSXElement: check,
      JSXFragment: check,
      ReturnStatement: (node) => {
        if (node.argument !== null) checkReturned(node.argument, enclosingFunction(node));
      },
      ArrowFunctionExpression: (node) => {
        if (node.body.type !== 'BlockStatement') checkReturned(node.body, node);
      },
    };
  },
});

const translateSafe = { rules: { 'text-in-own-element': textInOwnElement } } as unknown as ESLint.Plugin;

/** The lint blocks that keep app text safe from browser translation: `eslint.config.js` and its test use them. */
export const translateSafeText: Linter.Config = {
  ...reactGoogleTranslate.configs.recommended,
  files: ['src/**/*.tsx'],
  plugins: { ...reactGoogleTranslate.configs.recommended.plugins, 'translate-safe': translateSafe },
  languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
  rules: { ...reactGoogleTranslate.configs.recommended.rules, 'translate-safe/text-in-own-element': 'error' },
};
