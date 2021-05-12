const commentByMapperElement = document.getElementById('commentByMapper')
const commentByModderElement = document.getElementById('commentByModder')
const saveButtonElement = document.getElementById('save-button')
const data = JSON.parse(document.getElementById('json-request').textContent)

commentByMapperElement.value = data.comment_by_mapper
commentByModderElement.value = data.comment_by_modder

async function save() {
    saveButtonElement.disabled = true
    toast('Updating the mod request...')
    const reqs = []
    if (commentByMapperElement.value !== data.comment_by_mapper) {
        reqs.push(fetch('/api/queue/edit_comment', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                request_id: data.id,
                type: `edit_mapper`,
                comment: commentByMapperElement.value,
            }),
        }).then(res => res.json()).then(data => !data.error))
    }
    if (commentByModderElement.value !== data.comment_by_modder) {
        reqs.push(fetch('/api/queue/edit_comment', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                request_id: data.id,
                type: `edit_modder`,
                comment: commentByModderElement.value,
            }),
        }).then(res => res.json()).then(data => !data.error))
    }
    const results = await Promise.all(reqs)
    const success = results.filter(Boolean).length
    const failed = results.length - success
    M.Toast.dismissAll()
    toast(`Updated ${success} / ${results.length}. (${failed} failed)`)
    setTimeout(() => saveButtonElement.disabled = false, 1000)
}

function queuePage() {
    openInNewTab('/queue') // hopefully we will be able to do like `/queue/${data.id}` in the future
}
