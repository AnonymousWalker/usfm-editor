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

const Demo: React.FC = () => {
    const [usfmOutput, setUsfmOutput] = React.useState(usfmString)

    const handleEditorChange = (usfm: string) => {
        setUsfmOutput(usfm)
    }

    return (
        <div className="row">
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                {/* The editor can be given a ref of type UsfmEditorRef
                 to have access to the editor API (use React.createRef<UsfmEditorRef>)
                */}
                <UsfmEditor
                    usfmString={usfmString}
                    onChange={handleEditorChange}
                    toolbarSpecs={defaultToolbarSpecs}
                />
            </div>
            <div style={{ display: "none" }}>
                <OutputUsfm usfm={usfmOutput} />
            </div>
        </div>
    )
}

const container = document.getElementById("root")
if (container) {
    ReactDOM.render(<Demo />, container)
}

