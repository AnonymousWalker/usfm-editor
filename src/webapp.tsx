import * as React from "react"
import * as ReactDOM from "react-dom"
import { Container, Box } from "@mui/material"
import "./style.css"
import "./demo/demo.css"
import { UsfmEditor } from "./index"
import { OutputUsfm } from "./demo/UsfmContainer"
import { defaultToolbarSpecs } from "./components/UsfmToolbar"

const usfmString = `
\\id GEN
\\c 1
\\p
\\v 1
\\v 2
\\v 3 1 The elder, To my dear friend Gaius, whom I love in the truth. 2 Dear friend, I pray that you may enjoy good health and that all may go well with you, even as your soul is getting along well. 3 It gave me great joy when some believers came and testified about your faithfulness to the truth, telling how you continue to walk in it.
\\v 4
\\v 5
\\v 6 5I have no greater joy than to hear that my children are walking in the truth. 6 Dear friend, you are faithful in what you are doing for the brothers and sisters, even though they are strangers to you. 4 They have told the church about your love. Please send them on their way in a manner that honors God.
\\v 7
\\v 8 8We ought therefore to show hospitality to such people so that we may work together for the truth.
\\p
\\p
\\v 9
\\v 10 9 I wrote to the church, but Diotrephes, who loves to be first, will not welcome us.
\\p
\\p

\\v11 
\\v12 11Dear friend, do not imitate what is evil but what is good. Anyone who does what is good is from God. Anyone who does what is evil has not seen God. 12Demetrius is well spoken of by everyone—and even by the truth itself. We also speak well of him, and you know that our testimony is true.
\\p
\\v 13 
\\v 14 13I have much to write you, but I do not want to do so with pen and ink. 14I hope to see you soon, and we will talk face to face. 15Peace to you. The friends here send their greetings. Greet the friends there by name.
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

