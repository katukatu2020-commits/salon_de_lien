  function dealerCategoriesV695(rows, manufacturer) {
    return [...new Set(rows.filter(row => !manufacturer || row.manufacturerName === manufacturer)
      .map(row => String(row.category || '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ja'))
  }
