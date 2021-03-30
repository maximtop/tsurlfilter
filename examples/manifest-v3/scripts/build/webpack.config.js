/* eslint-disable max-len */
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import path from 'path';

const BACKGROUND_PATH = path.resolve(__dirname, '../../extension/pages/background');
const CONTENT_SCRIPT = path.resolve(__dirname, '../../extension/pages/content-script');
const BUILD_PATH = path.resolve(__dirname, '../../build');

export const config = {
    mode: 'development',
    devtool: 'eval-source-map',
    entry: {
        'pages/background': BACKGROUND_PATH,
        'pages/content-script': CONTENT_SCRIPT,
    },
    output: {
        path: BUILD_PATH,
        filename: '[name].js',
    },
    resolve: {
        extensions: ['*', '.js', '.jsx'],
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: ['cache-loader', {
                    loader: 'babel-loader',
                    options: { babelrc: true },
                }],
            },
            {
                test: /\.(css|pcss)$/,
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: { importLoaders: 1 },
                    },
                    'postcss-loader',
                ],
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'file-loader',
                        options: { outputPath: 'assets' },
                    },
                ],
            },
        ],
    },

    plugins: [
        new CleanWebpackPlugin(),
        ...getModuleReplacements(browserConfig),
        new HtmlWebpackPlugin({
            template: path.join(BACKGROUND_PATH, 'index.html'),
            templateParameters: {
                browser: process.env.BROWSER,
            },
            filename: 'pages/background.html',
            chunks: ['pages/background'],
            cache: false,
        }),
        new HtmlWebpackPlugin({
            template: path.join(OPTIONS_PATH, 'index.html'),
            filename: 'pages/options.html',
            chunks: ['pages/options'],
            cache: false,
        }),
        new HtmlWebpackPlugin({
            template: path.join(POPUP_PATH, 'index.html'),
            filename: 'pages/popup.html',
            chunks: ['pages/popup'],
            cache: false,
        }),
        new HtmlWebpackPlugin({
            template: path.join(FILTERING_LOG_PATH, 'index.html'),
            filename: 'pages/filtering-log.html',
            chunks: ['pages/filtering-log'],
            cache: false,
        }),
        new HtmlWebpackPlugin({
            template: path.join(FILTER_DOWNLOAD_PATH, 'index.html'),
            filename: 'pages/filter-download.html',
            chunks: ['pages/filter-download'],
            cache: false,
        }),
        new HtmlWebpackPlugin({
            template: path.join(EXPORT_PATH, 'index.html'),
            filename: 'pages/export.html',
            chunks: ['pages/export'],
            cache: false,
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    context: 'Extension',
                    from: 'assets',
                    to: 'assets',
                },
                {
                    context: 'Extension',
                    from: '_locales',
                    to: '_locales',
                    transform: (content) => updateLocalesMSGName(content, process.env.BUILD_ENV, browserConfig.browser),
                },
                {
                    context: 'Extension',
                    from: 'web-accessible-resources',
                    to: 'web-accessible-resources',
                },
                {
                    context: 'Extension',
                    from: 'pages/blocking-pages',
                    to: 'pages/blocking-pages',
                },
                {
                    context: 'Extension',
                    from: 'src/content-script/subscribe.js',
                    to: 'content-script/subscribe.js',
                },
            ],
        }),
    ],
};
