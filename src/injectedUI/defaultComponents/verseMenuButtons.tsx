import React, { Component, FC } from "react"
import PropTypes from "prop-types"
import MenuItem from "@mui/material/MenuItem"
import { HasHandleClick } from "../../injectedUI/UIComponentContext"

import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"

import LinkIcon from "@mui/icons-material/Link"
import LinkOffIcon from "@mui/icons-material/LinkOff"
import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"

interface VerseMenuButtonProps {
    icon: PropTypes.ReactComponentLike
    text: string
    handleClick: (event: React.MouseEvent) => void
}

const PROP_TYPES = {
    icon: PropTypes.elementType.isRequired,
    text: PropTypes.string.isRequired,
    handleClick: PropTypes.func.isRequired,
} as const

class VerseMenuButton extends Component<VerseMenuButtonProps> {
    static propTypes = PROP_TYPES
    render() {
        return (
            <MenuItem onClick={this.props.handleClick}>
                <ListItemIcon>
                    <this.props.icon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={this.props.text} />
            </MenuItem>
        )
    }
}

export const JoinWithPreviousVerseButton: FC<HasHandleClick> = ({
    handleClick,
}) => {
    return (
        <VerseMenuButton
            icon={LinkIcon}
            text={"Join with previous verse"}
            handleClick={handleClick}
        />
    )
}
JoinWithPreviousVerseButton.propTypes = PROP_TYPES

export const UnjoinVerseRangeButton: FC<HasHandleClick> = ({ handleClick }) => {
    return (
        <VerseMenuButton
            icon={LinkOffIcon}
            text={"Unjoin verses"}
            handleClick={handleClick}
        />
    )
}
UnjoinVerseRangeButton.propTypes = PROP_TYPES

export const AddVerseButton: FC<HasHandleClick> = ({ handleClick }) => {
    return (
        <VerseMenuButton
            icon={AddIcon}
            text={"Add verse"}
            handleClick={handleClick}
        />
    )
}
AddVerseButton.propTypes = PROP_TYPES

export const RemoveVerseButton: FC<HasHandleClick> = ({ handleClick }) => {
    return (
        <VerseMenuButton
            icon={DeleteIcon}
            text={"Remove verse"}
            handleClick={handleClick}
        />
    )
}
RemoveVerseButton.propTypes = PROP_TYPES
