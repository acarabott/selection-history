const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");


module.exports = {
  resolve: {
    extensions: [".ts", ".js"]
  },
  entry: "./src/scripts/selection-history.ts",
  plugins: [
    new HtmlWebpackPlugin({
      filename: "iframe.html",
      template: "./src/html/iframe.html",
      inject: "body",
    }),
    new CopyWebpackPlugin([
      {
        from: "./src/css/selection-history.css",
        to: "selection-history.css"
      },
      {
        from: "./src/html/index.html",
        to: "index.html"
      }
    ])
  ],
  output: {
    filename: "selection-history-bundle.js",
    path: path.resolve(__dirname, "dist")
  },
  module: {
    rules: [
      { test: /\.ts?$/, loader: "ts-loader" }
    ]
  },
  devServer: {
    stats: {
      assets: false,
      hash: false,
      chunks: false,
      errors: true,
      errorDetails: true,
    },
    overlay: true
  }
};
