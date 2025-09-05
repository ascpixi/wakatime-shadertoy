const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: {
    background: "./src/background.ts",
    content: "./src/content.ts",
    popup: "./src/popup.ts",
    options: "./src/options.ts",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "src/manifest-chrome.json", to: "manifest.json" },
        { from: "src/manifest-firefox.json", to: "manifest-firefox.json" },
        { from: "src/popup.html", to: "popup.html" },
        { from: "src/options.html", to: "options.html" },
        { from: "src/icons", to: "icons" },
        { from: "src/injected.js", to: "injected.js" },
      ],
    }),
  ],
};
