export default defineAppConfig({
  ui: {
    colors: {
      primary: 'poke', // rouge Poké (rampe custom, main.css)
      secondary: 'amber', // économie : coins, prix, cagnottes
      success: 'green',
      info: 'sky',
      warning: 'orange',
      error: 'red',
      neutral: 'ash' // gris blanc/gris (rampe custom, main.css)
    },
    button: {
      defaultVariants: {
        size: 'md'
      }
    }
  }
})
