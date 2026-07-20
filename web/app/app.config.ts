export default defineAppConfig({
  ui: {
    colors: {
      primary: 'violet', // phosphore
      secondary: 'amber', // économie : coins, prix, cagnottes
      success: 'emerald',
      info: 'sky',
      warning: 'orange',
      error: 'red',
      neutral: 'night' // rampe custom (main.css)
    },
    // Boutons pleins : forcer un shade suffisamment contrasté pour le libellé
    // (a11y : blanc/violet-500 = 4.23:1 échoue ; violet-600 = 5.70:1 OK).
    button: {
      defaultVariants: {
        size: 'md'
      }
    }
  }
})
