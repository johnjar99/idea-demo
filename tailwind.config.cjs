module.exports = {
  content: ['./*.html', './js/**/*.js'],
  theme: { extend: {} },
  safelist: [
    { pattern: /^(bg|text|border|from|to|via|ring)-(red|amber|emerald|sky|slate|green|yellow|rose|orange|violet|indigo|blue|teal|cyan|fuchsia|gray|stone|neutral|zinc)-(50|100|200|300|400|500|600|700|800|900)$/ },
    { pattern: /^(grid-cols|col-span|gap|space-x|space-y)-(1|2|3|4|5|6|8|10|12)$/ },
    { pattern: /^(text)-(xs|sm|base|lg|xl|2xl|3xl|4xl)$/ },
    'hidden','block','flex','grid','inline-flex','items-center','justify-between','justify-center','text-center','font-bold','font-semibold','rounded-xl','rounded-2xl','rounded-full'
  ],
};
