(() => {
  const nav = document.querySelector('.wo-dealer-mobile-nav')
  const active = nav?.querySelector('.active')
  if (nav && active && matchMedia('(max-width:767.98px)').matches) {
    nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.clientWidth) / 2
  }
})()
