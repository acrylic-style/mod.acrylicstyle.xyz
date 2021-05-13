const mapsElement = document.getElementById('maps')
const labelElement = document.getElementById('label')

const page = query['page'] || 0
fetch(`/api/queue?page=${page}`).then(async r => {
    if (r.status !== 200) {
        return toast('Failed to fetch modding queue')
    }
    const data = await r.json()
    const hasPreviousPages = page > 0
    const hasMorePages = data.max_entries / 50 > page + 1
    labelElement.textContent = labelElement.textContent.replace('? / ?', `${Math.min(data.max_entries, (page + 1) * 50)} / ${data.max_entries}`)
    const me = await whoAmI();
    for (const e of data.entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())) {
        mapsElement.appendChild(await renderRequestCard(e))
    }
})
