```jsx
const usfmString = `
\\id GEN
\\c 1
\\p
\\v 1 the first verse of chapter one.
\\v 2 the second verse of chapter one.
\\c 2
\\p
\\v 1 the first verse of chapter two
\\v 2 the second verse of chapter two
\\c 11
\\p
\\v 1 the first verse of chapter 11
\\v 2 the second verse of chapter 11
\\c 12
\\p
\\v 1 the first verse of chapter 12
\\v 2 the second verse of chapter 12
`

import * as React from "react"
import "../style.css"
import "./demo.css"
import { OutputUsfm } from "./UsfmContainer"

// The following object should be imported from the "usfm-editor" module like this:
// import { UsfmEditor } from "usfm-editor"
import { UsfmEditor } from "../index"

class Demo extends React.Component {
    constructor(props) {
        super(props)
        this.handleEditorChange = this.handleEditorChange.bind(this)
        this.state = { usfmOutput: usfmString }
    }

    handleEditorChange(usfm) {
        this.setState({ usfmOutput: usfm })
    }

    render() {
        return (
            <div className="row">
                <div className="column column-left">
                    <h3>Select Chapter</h3>

                    {/* The editor can be given a ref of type UsfmEditorRef
                     to have access to the editor API (use React.createRef<UsfmEditorRef>)
                    */}
                    <UsfmEditor
                        usfmString={usfmString}
                        onChange={this.handleEditorChange}
                    />
                </div>
                <div className="column column-right">
                    <OutputUsfm usfm={this.state.usfmOutput} />
                </div>
            </div>
        )
    }
}

;<Demo />
```
