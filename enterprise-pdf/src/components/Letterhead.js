const React = require("react");
const { View, Text, StyleSheet } = require("@react-pdf/renderer");
const { tokens } = require("../design-tokens");

const styles = StyleSheet.create({
  letterhead: {
    paddingBottom: tokens.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: tokens.colors.primary,
    marginBottom: tokens.spacing.lg,
  },
  letterheadTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: tokens.spacing.md,
  },
  companyInfoLeft: {
    flex: 1,
  },
  companyName: {
    fontSize: 20,
    fontFamily: tokens.fonts.heading,
    color: tokens.colors.primary,
    marginBottom: 2,
  },
  companyTagline: {
    fontSize: 10,
    fontFamily: tokens.fonts.body,
    color: tokens.colors.textLight,
  },
  companyInfoRight: {
    textAlign: "right",
  },
  addressLine: {
    fontSize: 9,
    fontFamily: tokens.fonts.body,
    color: tokens.colors.text,
    marginBottom: 2,
  },
  footer: {
    marginTop: "auto",
    paddingTop: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    fontFamily: tokens.fonts.body,
    color: tokens.colors.textMuted,
  },
  confidentiality: {
    fontFamily: tokens.fonts.heading,
    color: tokens.colors.primary,
  },
});

const Letterhead = () => {
  return React.createElement(
    View,
    { style: styles.letterhead },
    React.createElement(
      View,
      { style: styles.letterheadTop },
      React.createElement(
        View,
        { style: styles.companyInfoLeft },
        React.createElement(Text, { style: styles.companyName }, "SEWA AI"),
        React.createElement(
          Text,
          { style: styles.companyTagline },
          "Trustworthy Clinical AI Platform"
        )
      ),
      React.createElement(
        View,
        { style: styles.companyInfoRight },
        React.createElement(
          Text,
          { style: styles.addressLine },
          "Storegrill Inc Ltd"
        ),
        React.createElement(
          Text,
          { style: styles.addressLine },
          "Company No. 14581073"
        ),
        React.createElement(
          Text,
          { style: styles.addressLine },
          "18 Hampshire Close, Binley"
        ),
        React.createElement(
          Text,
          { style: styles.addressLine },
          "Coventry, CV3 2FP, England"
        ),
        React.createElement(
          Text,
          { style: styles.addressLine },
          "info@sewaxai.health · www.sewaxai.health"
        )
      )
    )
  );
};

const LetterFooter = ({ confidential = true }) => {
  const currentYear = new Date().getFullYear();
  return React.createElement(
    View,
    { style: styles.footer },
    React.createElement(
      Text,
      { style: styles.footerText },
      `© ${currentYear} Storegrill Inc Ltd · INN-2604-0064-2 · GB2609706.3`
    ),
    confidential &&
      React.createElement(
        Text,
        { style: [styles.footerText, styles.confidential] },
        "CONFIDENTIAL"
      )
  );
};

module.exports = { Letterhead, LetterFooter };
