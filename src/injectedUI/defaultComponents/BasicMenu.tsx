import * as React from "react"
import PropTypes from "prop-types"
import MenuList from "@mui/material/MenuList"
import Paper from "@mui/material/Paper"

const BasicMenu = React.forwardRef<HTMLUListElement, BasicMenuProps>(
    ({ children }, ref) => (
        <Paper>
            <MenuList ref={ref}>{children}</MenuList>
        </Paper>
    )
)

BasicMenu.displayName = "BasicMenu"

BasicMenu.propTypes = {
    children: PropTypes.any,
}

interface BasicMenuProps {
    children: React.ReactNode
}

export default BasicMenu
