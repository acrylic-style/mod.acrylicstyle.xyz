const beatmapLinkElement = document.getElementById('beatmap_link')
const commentElement = document.getElementById('comment')
const submitButtonElement = document.getElementById('submit-button')

const beatmapSetPattern = /http(s)?:\/\/osu\.ppy\.sh\/(beatmapset)?s\/(\d+)#?.*/i

submitButtonElement.addEventListener('click', ev => {
    ev.preventDefault()
    submitButtonElement.disabled = true
    const beatmap = beatmapLinkElement.value
    if (!beatmap) {
        beatmapLinkElement.classList.toggle('invalid', true)
        return toast('Beatmap link is missing')
    }
    if (!beatmapSetPattern.test(beatmap)) {
        beatmapLinkElement.classList.toggle('invalid', true)
        return toast('Beatmap link is invalid')
    }
    const beatmapSetId = beatmap.replace(beatmapSetPattern, '$3')
    const comment = commentElement.value
    if (comment.length > 255) {
        commentElement.classList.toggle('invalid', true)
        return toast('Comment must not exceed 255 characters')
    }
    toast('Submitting the beatmap...')
    fetch('/api/queue/submit', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            beatmapSetId,
            comment,
        })
    }).then(async res => {
        // noinspection JSUnresolvedFunction - weird but ok
        M.Toast.dismissAll()
        const data = await res.json()
        submitButtonElement.disabled = false
        if (data['error']) {
            const error = data['error']
            if (error === 'login_required') {
                toast('Session expired. Please login again (reload the page).')
            } else if (error === 'not_your_beatmapset') {
                toast('This beatmapset is not yours!\nYou can\'t submit maps that you don\'t own!')
            } else if (error === 'unexpected_api_error') {
                toast('Unknown error occurred during fetching a beatmap.')
            } else if (error === 'no_8_stars') {
                toast('One or more difficulty has 8+ star rating.')
            } else if (error === 'wrong_status') {
                toast('Beatmap must be pending or WIP.')
            } else if (error === 'not_found') {
                toast('Beatmap does not found.')
            } else if (error === 'time') {
                toast(`You can't submit a beatmap yet!\nYou will be able to submit a map ${data['time']}.`) // soon (<60 seconds), in x days, in x weeks
            } else if (error === 'banned') {
                toast(`You are banned from using the mod request system.\nReason: ${data['reason']}`)
            } else {
                toast('Unknown error during submitting a beatmap: ' + error)
            }
            return
        }
        toast('Submitted a beatmap successfully!')
    })
})
