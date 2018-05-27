const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");


module.exports = {
  resolve: {
    extensions: [".ts", ".js"]
  },
  entry: "./src/selection-history.ts",
  plugins: [
    new HtmlWebpackPlugin({
      filename: "iframe.html",
      template: "iframe.html",
      inject: "body",
    }),
    new CopyWebpackPlugin([
      {
        from: "selection-history.css",
        to: "selection-history.css"
      }
    ])
  ],
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "/dist/"
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
