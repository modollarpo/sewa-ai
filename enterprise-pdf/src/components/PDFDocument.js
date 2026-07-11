const React = require("react");
const { Document, Page, StyleSheet, Font, View, Text } = require("@react-pdf/renderer");
const { tokens } = require("../design-tokens");
const { Letterhead, LetterFooter } = require("./Letterhead");

Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: 700 },
    { src: "Helvetica-Oblique", fontStyle: "italic" },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: tokens.spacing.xl,
    paddingTop: tokens.spacing.xxl,
    fontFamily: tokens.fonts.body,
    backgroundColor: tokens.colors.background,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: tokens.fonts.heading,
    color: tokens.colors.primaryDark,
    marginBottom: tokens.spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: tokens.fonts.body,
    color: tokens.colors.textLight,
    marginBottom: tokens.spacing.lg,
  },
});

const PDFDocument = ({ title, subtitle, children, confidential = true }) => {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Letterhead),
      React.createElement(
        View,
        { style: styles.content },
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.title }, title),
          subtitle &&
            React.createElement(Text, { style: styles.subtitle }, subtitle)
        ),
        children
      ),
      React.createElement(LetterFooter, { confidential })
    )
  );
};

module.exports = { PDFDocument };
