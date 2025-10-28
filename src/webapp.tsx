import * as React from "react"
import * as ReactDOM from "react-dom"
import { Container, Box } from "@material-ui/core"
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
\\p Lorem ipsum dolor sit amet, consectetur adipiscing elit.
\\p Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Morbi turpis sem, placerat eu condimentum id, pellentesque ut magna. Praesent dignissim arcu ac libero ultrices dapibus.
`

const Demo: React.FC = () => {
    const [usfmOutput, setUsfmOutput] = React.useState(usfmString)

    const handleEditorChange = (usfm: string) => {
        setUsfmOutput(usfm)
    }

    return (
        <Container maxWidth="md" style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
            <Box py={4}>
                <div className="row">
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', lineHeight: '1.5' }}>
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
            </Box>
        </Container>
    )
}

const container = document.getElementById("root")
if (container) {
    ReactDOM.render(<Demo />, container)
}

