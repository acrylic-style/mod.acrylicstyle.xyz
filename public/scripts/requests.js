const beatmapLinkElement = document.getElementById('beatmap_link')
const commentElement = document.getElementById('comment')
const submitButtonElement = document.getElementById('submit-button')
const submitButtonLabelElement = document.getElementById('submit-button-label')

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
                // we don't show "you are not logged in" because it's normally impossible unless they modify the button element
                toast('Error: Session expired. Please login again (reload the page).')
            } else if (error === 'not_your_beatmapset') {
                toast('Error: This beatmapset is not yours!\nYou can\'t submit maps that you don\'t own!')
            } else if (error === 'unexpected_api_error') {
                toast('Error: Unknown error occurred during fetching a beatmap.')
            } else if (error === 'no_8_stars') {
                toast('Error: One or more difficulty has 7+ star rating.')
            } else if (error === 'wrong_status') {
                toast('Error: Beatmap must be pending or WIP.')
            } else if (error === 'not_found') {
                toast('Error: Beatmap does not found.')
            } else if (error === 'time') {
                toast(`Error: You can't request mod yet!\nYou will be able to request mod ${data['time']}.`) // soon (<60 seconds), in x days, in x weeks
            } else if (error === 'banned') {
                toast(`Error: You are banned from using the mod request system.\nReason: ${data['reason']}`)
            } else {
                toast('Error: Unknown error during submitting mod request: ' + error)
            }
            return
        }
        toast('Submitted a beatmap successfully!')
    })
})

me(v => {
    submitButtonElement.disabled = !v
    submitButtonLabelElement.textContent = v ? 'Submit' : 'Login to submit'
})
