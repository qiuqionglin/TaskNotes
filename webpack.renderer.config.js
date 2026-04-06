const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isDev = (argv && argv.mode) !== 'production';

  return {
    entry: './src/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist', 'renderer'),
      filename: 'renderer.js',
      clean: true,
    },
    target: 'electron-renderer',
    mode: isDev ? 'development' : 'production',
    devtool: isDev ? 'cheap-module-source-map' : false,
    devServer: {
      port: 3000,
      hot: true,
      static: {
        directory: path.resolve(__dirname, 'dist', 'renderer'),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.json',
            },
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/index.html',
      }),
    ],
  };
};
