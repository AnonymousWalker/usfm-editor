/* eslint-disable @typescript-eslint/no-var-requires */

const path = require("path")

module.exports = {
    skipComponentsWithoutExample: true,
    styleguideDir: "docs",
    propsParser: (filePath, source, resolver, handlers) => {
        const { ext } = path.parse(filePath)
        return ext === ".tsx"
            ? require("react-docgen-typescript").parse(
                  filePath,
                  source,
                  resolver,
                  handlers
              )
            : require("react-docgen").parse(source, resolver, handlers)
    },
    pagePerSection: true,
    showSidebar: false,
    exampleMode: 'hide',
    usageMode: 'hide',
    sections: [
        {
            name: "Full-Featured Editor",
            content: "src/demo/full-featured-editor.md",
        }
    ],
}
