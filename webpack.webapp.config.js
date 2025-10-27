const path = require("path")

module.exports = {
    entry: "./src/webapp.tsx",
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx"],
        fullySpecified: false,
    },
    output: {
        path: path.resolve(__dirname, "webapp-dist"),
        filename: "bundle.js",
    },
    mode: "development",
    devServer: {
        static: {
            directory: path.join(__dirname, "webapp-dist"),
        },
        compress: true,
        port: 3000,
        open: true,
    },
    module: {
        rules: [
            {
                test: /\.(t|j)sx?$/,
                exclude: /node_modules/,
                loader: "ts-loader",
            },
            {
                test: /\.m?js$/,
                resolve: {
                    fullySpecified: false,
                },
            },
            {
                test: /\.css$/i,
                exclude: /\.lazy\.css$/i,
                use: ["style-loader", "css-loader"],
            },
            {
                test: /\.lazy\.css$/i,
                use: [
                    {
                        loader: "style-loader",
                        options: { injectType: "lazyStyleTag" },
                    },
                    "css-loader",
                ],
            },
            {
                test: /\.js$/,
                loader: "source-map-loader",
                enforce: "pre",
            },
            {
                test: /\.svg$/,
                use: ["@svgr/webpack", "file-loader"],
            },
        ],
    },
}

