import * as React from "react"
import * as ReactDOM from "react-dom"
import "./style.css"
import "./demo/demo.css"
import { UsfmEditor } from "./index"
import { OutputUsfm } from "./demo/UsfmContainer"
import { defaultToolbarSpecs } from "./components/UsfmToolbar"

const usfmString = `
\\id GEN
\\c 1
\\p
\\v 1 This is verse one
`

class Demo extends React.Component {
    constructor(props: Record<string, never>) {
        super(props)
        this.handleEditorChange = this.handleEditorChange.bind(this)
        this.state = { usfmOutput: usfmString }
    }

    handleEditorChange(usfm: string) {
        this.setState({ usfmOutput: usfm })
    }

    render() {
        return (
            <div className="row">
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    {/* The editor can be given a ref of type UsfmEditorRef
                     to have access to the editor API (use React.createRef<UsfmEditorRef>)
                    */}
                    <UsfmEditor
                        usfmString={usfmString}
                        onChange={this.handleEditorChange}
                        toolbarSpecs={defaultToolbarSpecs}
                    />
                </div>
                <div style={{ display: "none" }}>
                    <OutputUsfm usfm={(this.state as { usfmOutput: string }).usfmOutput} />
                </div>
            </div>
        )
    }
}

const container = document.getElementById("root")
if (container) {
    ReactDOM.render(<Demo />, container)
}

