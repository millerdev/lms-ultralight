import PropTypes from 'prop-types'
import React from 'react'

export const MenuContext = React.createContext({
  addKeydownHandler: PropTypes.func.isRequired,
  mediaNav: PropTypes.func.isRequired,
})
