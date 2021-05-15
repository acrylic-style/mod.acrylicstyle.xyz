const bannedElement = document.getElementById('banned')
const bannedReasonElement = document.getElementById('banned-reason')
const bannedReasonContainerElement = document.getElementById('banned-reason-container')
const getChecked = (name) => document.querySelector(`input[type=radio][name=${name}]:checked`)
const modal = M.Modal.getInstance(document.getElementById('admin-self-warning'))
const user = JSON.parse(document.getElementById('json-user').textContent)

function toggleBanned() {
    bannedReasonContainerElement.classList.toggle('hidden', !bannedElement.checked)
}

function saveUser() {
    fetch('/admin/api/save_user', {
        method: 'post',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            id: user.id,
            group: getChecked('group').value,
            banned: bannedElement.checked,
            banned_reason: bannedElement.checked ? bannedReasonElement.value : '',
        }),
    }).then(res => res.json()).then(res => {
        if (res.error) {
            return toast('Failed to save data: ' + res.error)
        }
        toast('Successfully saved user data!')
    })
}

if (user.group === 'admin') {
    document.getElementById('group-admin').checked = true
} else if (user.group === 'modder') {
    document.getElementById('group-modder').checked = true
} else {
    document.getElementById('group-user').checked = true
}
if (user.mod_queue_banned) {
    bannedElement.checked = true
}
if (user.mod_queue_banned_reason) {
    bannedReasonElement.value = user.mod_queue_banned_reason
}

const handler = type => ev => {
    ev.preventDefault()
    modal.open()
    const yes = document.getElementById('modal-yes')
    const no = document.getElementById('modal-no')
    const yesHandler = ev => {
        ev.target.removeEventListener('click', yesHandler)
        document.getElementById('group-admin').checked = false
        document.getElementById(`group-${type}`).checked = true
    }
    yes.addEventListener('click', yesHandler)
    const noHandler = ev => {
        ev.target.removeEventListener('click', noHandler)
        document.getElementById(`group-${type}`).checked = false
        document.getElementById('group-admin').checked = true
    }
    no.addEventListener('click', noHandler)
}

whoAmI().then(me => {
    if (user.id === me.id) {
        document.getElementById('group-user').addEventListener('click', handler('user'))
        document.getElementById('group-modder').addEventListener('click', handler('modder'))
    }
})

toggleBanned()
