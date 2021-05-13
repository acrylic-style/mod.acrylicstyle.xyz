const statusLabelElement = document.getElementById('status-label')

const refreshStatus = () => {
    fetch('/api/config')
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
    fetch('/admin/api/status?action=open')
        .then(res => res.json())
        .then(res => {
            if (res.error) {
                return toast('Error: Could not change status: ' + res.error)
            }
            refreshStatus()
        })
}

async function closeQueue() {
    fetch('/admin/api/status?action=close')
        .then(res => res.json())
        .then(res => {
            if (res.error) {
                return toast('Error: Could not change status: ' + res.error)
            }
            refreshStatus()
        })
}

refreshStatus()
