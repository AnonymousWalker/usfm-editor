```jsx
const usfmString = `
\\id GEN
\\c 1
\\p
\\v 1 the first verse of chapter one.
\\v 2 the second verse of chapter one.
\\p Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
\\p Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
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
                <div className="column column-left" style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <h3>Select Chapter</h3>

                    {/* The editor can be given a ref of type UsfmEditorRef
                     to have access to the editor API (use React.createRef<UsfmEditorRef>)
                    */}
                    <UsfmEditor
                        usfmString={usfmString}
                        onChange={this.handleEditorChange}
                    />
                    <div style={{ height: "12rem" }} />
                    <hr/>
                    <h5>Please don't delete verse 1</h5>
                    <h5>You can type \v {"{"} number {"}"} or type \ and press Tab to accept the suggestion</h5>
                    <h5>You can highlight a word or a few words to add verse marker. Don't select across verse boundary</h5>
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
