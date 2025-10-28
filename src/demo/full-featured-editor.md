```jsx
const usfmString = `
\\id GEN
\\c 1
\\p
\\v 1 This is verse one
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
                <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    {/* The editor can be given a ref of type UsfmEditorRef
                     to have access to the editor API (use React.createRef<UsfmEditorRef>)
                    */}
                    <UsfmEditor
                        usfmString={usfmString}
                        onChange={this.handleEditorChange}
                    />
                </div>
                <div style={{ display: "none" }}>
                    <OutputUsfm usfm={this.state.usfmOutput} />
                </div>
            </div>
        )
    }
}

;<Demo />
```
