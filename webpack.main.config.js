const path = require('path');

module.exports = (env, argv) => {
  const isDev = (argv && argv.mode) !== 'production';

  return {
    entry: {
      main: './electron/main.ts',
      preload: './electron/preload.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: false,
    },
    target: 'electron-main',
    mode: isDev ? 'development' : 'production',
    devtool: isDev ? 'eval-source-map' : false,
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.node.json',
            },
          },
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    node: {
      __dirname: false,
      __filename: false,
    },
  };
};
