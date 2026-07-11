const React = require("react");
const { marked } = require("marked");
const { Text, View, Link, StyleSheet } = require("@react-pdf/renderer");
const { tokens } = require("../design-tokens");

const styles = StyleSheet.create({
  h1: {
    fontSize: 24,
    fontFamily: tokens.fonts.heading,
    color: tokens.colors.primaryDark,
    marginBottom: tokens.spacing.md,
    marginTop: tokens.spacing.lg,
  },
  h2: {
    fontSize: 20,
    fontFamily: tokens.fonts.heading,
    color: tokens.colors.primary,
    marginBottom: tokens.spacing.sm,
    marginTop: tokens.spacing.md,
  },
  h3: {
    fontSize: 16,
    fontFamily: tokens.fonts.heading,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.xs,
    marginTop: tokens.spacing.sm,
  },
  p: {
    fontSize: 11,
    fontFamily: tokens.fonts.body,
    color: tokens.colors.text,
    lineHeight: 1.6,
    marginBottom: tokens.spacing.sm,
  },
  ul: {
    marginBottom: tokens.spacing.sm,
    marginLeft: tokens.spacing.md,
  },
  ol: {
    marginBottom: tokens.spacing.sm,
    marginLeft: tokens.spacing.md,
  },
  li: {
    fontSize: 11,
    fontFamily: tokens.fonts.body,
    color: tokens.colors.text,
    lineHeight: 1.6,
    marginBottom: tokens.spacing.xs,
  },
  strong: {
    fontFamily: tokens.fonts.heading,
  },
  em: {
    fontStyle: "italic",
  },
  link: {
    color: tokens.colors.secondary,
    textDecoration: "underline",
  },
  code: {
    fontFamily: "Courier",
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  blockquote: {
    borderLeftWidth: 4,
    borderLeftColor: tokens.colors.primary,
    paddingLeft: tokens.spacing.md,
    marginLeft: tokens.spacing.sm,
    marginBottom: tokens.spacing.sm,
    fontStyle: "italic",
  },
  table: {
    display: "table",
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: tokens.spacing.sm,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableCell: {
    flex: 1,
    padding: tokens.spacing.xs,
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    fontSize: 10,
    fontFamily: tokens.fonts.body,
  },
  tableHeader: {
    backgroundColor: tokens.colors.surface,
    fontFamily: tokens.fonts.heading,
  },
  hr: {
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
    marginVertical: tokens.spacing.md,
  },
});

function renderInline(token) {
  if (!token) return null;
  switch (token.type) {
    case "text":
      return token.text;
    case "strong":
      return React.createElement(
        Text,
        { style: styles.strong },
        renderInlineTokens(token.tokens)
      );
    case "em":
      return React.createElement(
        Text,
        { style: styles.em },
        renderInlineTokens(token.tokens)
      );
    case "link":
      return React.createElement(
        Link,
        { src: token.href, style: styles.link },
        renderInlineTokens(token.tokens)
      );
    case "codespan":
      return React.createElement(Text, { style: styles.code }, token.text);
    case "br":
      return "\n";
    default:
      return null;
  }
}

function renderInlineTokens(tokens = []) {
  if (!tokens) return [];
  return tokens.map((token, i) =>
    React.createElement(React.Fragment, { key: i }, renderInline(token))
  );
}

function renderBlock(token, index) {
  switch (token.type) {
    case "heading": {
      const styleSheet =
        token.depth === 1 ? styles.h1 : token.depth === 2 ? styles.h2 : styles.h3;
      return React.createElement(
        Text,
        { key: index, style: styleSheet },
        renderInlineTokens(token.tokens)
      );
    }
    case "paragraph": {
      return React.createElement(
        Text,
        { key: index, style: styles.p },
        renderInlineTokens(token.tokens)
      );
    }
    case "list": {
      const containerStyle = token.ordered ? styles.ol : styles.ul;
      return React.createElement(
        View,
        { key: index, style: containerStyle },
        token.items.map((item, i) =>
          React.createElement(
            View,
            { key: i },
            React.createElement(
              Text,
              { style: styles.li },
              token.ordered ? `${i + 1}. ` : "• ",
              item.tokens ? item.tokens.map((child, j) =>
                renderInlineTokens(child.tokens || [])
              ) : null
            )
          )
        )
      );
    }
    case "blockquote": {
      return React.createElement(
        View,
        { key: index, style: styles.blockquote },
        token.tokens.map((child, i) => renderBlock(child, i))
      );
    }
    case "code": {
      return React.createElement(Text, { key: index, style: styles.code }, token.text);
    }
    case "hr":
      return React.createElement(View, { key: index, style: styles.hr });
    case "table": {
      return React.createElement(
        View,
        { key: index, style: styles.table },
        React.createElement(
          View,
          { style: [styles.tableRow, styles.tableHeader] },
          token.header.map((cell, i) =>
            React.createElement(
              View,
              { key: i, style: [styles.tableCell, styles.tableHeader] },
              React.createElement(Text, null, renderInlineTokens(cell.tokens))
            )
          )
        ),
        token.rows.map((row, rowIndex) =>
          React.createElement(
            View,
            { key: rowIndex, style: styles.tableRow },
            row.map((cell, cellIndex) =>
              React.createElement(
                View,
                { key: cellIndex, style: styles.tableCell },
                React.createElement(Text, null, renderInlineTokens(cell.tokens))
              )
            )
          )
        )
      );
    }
    default:
      return null;
  }
}

function markdownToReact(markdown) {
  const tokenList = marked.lexer(markdown);
  return tokenList.map((token, i) => renderBlock(token, i));
}

module.exports = { markdownToReact };
