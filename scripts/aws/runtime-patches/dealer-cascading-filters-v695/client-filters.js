  function syncDealerFiltersV695(kind) {
    const prefix = kind === 'products' ? 'product' : 'pricing'
    const filters = dealer.data.productFilters || {}
    const manufacturer = dealer[prefix + 'Manufacturer']
    const categories = dealerCategoriesV695(filters.categoryGroups || [], manufacturer)
    if (!categories.includes(dealer[prefix + 'Category'])) dealer[prefix + 'Category'] = ''
    for (const [field, values, label] of [['manufacturer', filters.manufacturers || [], 'すべてのメーカー'], ['category', categories, 'すべての種別']]) {
      const select = root.querySelector('#dealer-' + prefix + '-' + field + '-filter')
      if (!select) continue
      const value = dealer[prefix + (field === 'manufacturer' ? 'Manufacturer' : 'Category')]
      const options = dealerFilterOptionsV659(values, value, label)
      // Keep the select and search input mounted; only refresh changed choices.
      if (select.dataset.optionsV695 !== options) { select.innerHTML = options; select.dataset.optionsV695 = options }
      select.value = value
    }
    const reset = root.querySelector('[data-action="reset-' + prefix + '-filters"]')
    if (reset) reset.disabled = !dealer[prefix + 'Query'] && !manufacturer && !dealer[prefix + 'Category']
  }
