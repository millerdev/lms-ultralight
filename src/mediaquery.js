import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'

/**
 * Render-prop wrapper around @mui/material/useMediaQuery.
 *
 * Pass either `up="<key>"` or `down="<key>"` where `<key>` is a MUI
 * breakpoint name (xs, sm, md, lg, xl) and a function as children; the
 * function receives the boolean result of the media query.
 *
 *   <MediaQuery up="sm">{wide => wide ? <X /> : <Y />}</MediaQuery>
 *
 * If both `up` and `down` are provided, `up` wins.
 */
const MediaQuery = ({ up, down, children }) => {
  const theme = useTheme()
  const query = up
    ? theme.breakpoints.up(up)
    : theme.breakpoints.down(down)
  return children(useMediaQuery(query))
}

export default MediaQuery
