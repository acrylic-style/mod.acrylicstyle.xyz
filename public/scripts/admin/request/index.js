const rulesElement = document.getElementById('rules')
const statusLabelElement = document.getElementById('status-label')
const newRuleElement = document.getElementById('new-rule')
const maxDifficultyRuleTextElement = document.getElementById('max-difficulty-rule-text')
const maxDiffElement = document.getElementById('max-diff')

const refreshStatus = () => {
    fetch('/api/config', { headers: { 'Accept': 'application/json' } })
        .then(res => res.json())
        .then(res => {
            if (res.requests.status === 'open') {
                statusLabelElement.textContent = 'Open'
            } else {
                statusLabelElement.textContent = 'Closed'
            }
        })
}

function openQueue() {
    fetch('/admin/api/status?action=open', { headers: { 'Accept': 'application/json' } })
        .then(res => res.json())
        .then(res => {
            if (res.error) {
                return toast('Error: Could not change status: ' + res.error)
            }
            refreshStatus()
            toast('Opened the queue')
        })
}

async function closeQueue() {
    fetch('/admin/api/status?action=close', { headers: { 'Accept': 'application/json' } })
        .then(res => res.json())
        .then(res => {
            if (res.error) {
                return toast('Error: Could not change status: ' + res.error)
            }
            refreshStatus()
            toast('Closed the queue')
        })
}

refreshStatus()

let rules = []

function renderRuleEntry(rule) {
    // <li class="collection-item"><div>Alvin<a href="#!" class="secondary-content"><i class="material-icons">send</i></a></div></li>
    const li = document.createElement('li')
    li.classList.add('collection-item')
    const div = document.createElement('div')
    const span = document.createElement('span')
    span.textContent = rule
    const trashLink = document.createElement('a')
    trashLink.classList.add('secondary-content', 'yes-it-is-a-link')
    trashLink.addEventListener('click', () => {
        rules = rules.filter(r => r !== rule)
        fadeOut(li)
        setTimeout(() => li.remove(), 1000)
    })
    const trashIcon = materialIcon('delete')
    const upLink = document.createElement('a')
    upLink.classList.add('secondary-content', 'yes-it-is-a-link')
    upLink.addEventListener('click', () => {
        const i = rules.indexOf(rule)
        move(rules, i, Math.max(0, i - 1))
        rulesElement.insertBefore(rulesElement.childNodes[i + 7], rulesElement.childNodes[Math.max(7, i + 7 - 1)])
    })
    const upIcon = materialIcon('arrow_upward')
    const downLink = document.createElement('a')
    downLink.classList.add('secondary-content', 'yes-it-is-a-link')
    downLink.addEventListener('click', () => {
        const i = rules.indexOf(rule)
        move(rules, i, Math.min(i + 1, rules.length - 1))
        rulesElement.insertBefore(rulesElement.childNodes[i + 7], rulesElement.childNodes[Math.min(i + 7 + 2, rules.length + 7)])
    })
    const downIcon = materialIcon('arrow_downward')

    trashLink.appendChild(trashIcon)
    upLink.appendChild(upIcon)
    downLink.appendChild(downIcon)
    div.appendChild(span)
    div.appendChild(trashLink)
    div.appendChild(downLink)
    div.appendChild(upLink)
    li.appendChild(div)
    return li
}

getConfig().then(config => {
    config.requests.rules.forEach((rule) => {
        rules.push(rule)
        rulesElement.appendChild(renderRuleEntry(rule))
    })
    maxDiffElement.value = config.requests.max_difficulty
})

function addRule() {
    const value = newRuleElement.value.slice(0, 255)
    if (!rules.includes(value)) {
        rules.push(value)
        rulesElement.appendChild(renderRuleEntry(value))
    }
    newRuleElement.value = ''
}

function move(arr, old_index, new_index) {
    if (new_index >= arr.length) {
        let k = new_index - arr.length + 1
        while (k--) arr.push(undefined)
    }
    arr.splice(new_index, 0, arr.splice(old_index, 1)[0])
    return arr
}

function saveRules() {
    fetch('/admin/api/rules_all', {
        method: 'post',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            rules: rules.map(s => s.slice(0, 255)),
            max_diff: maxDiffElement.value === '' ? null : (Math.round(parseFloat(maxDiffElement.value) * 100) / 100),
        }),
    }).then(res => res.json()).then(res => {
        if (res.error) {
            toast(`Failed to save rules: ${res.error}`)
            return
        }
        if (maxDiffElement.value !== '') {
            maxDifficultyRuleTextElement.textContent = `No maps that has ${(Math.round(parseFloat(maxDiffElement.value) * 100) / 100)}+ star rating`
        }
        toast('Saved rules!')
    })
}
