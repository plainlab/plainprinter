module.exports = {
  theme: {},
  purge: {
    content: ['./src/**/*.{ts,tsx,html}'],
  },
  variants: {
    extend: {
      backgroundColor: ['active', 'disabled'],
      textColor: ['active'],
      opacity: ['disabled'],
      outline: ['focus', 'active'],
    },
  },
  plugins: [],
};
