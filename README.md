# [mod.acrylicstyle.xyz](https://mod.acrylicstyle.xyz)
mod queue site

## APIs
endpoint: `${APP_URL}/api`

rate limit is set to 60 requests per minute unless noted explicitly.

### no login required
- `GET /config` (240 reqs/minute) - fetches configuration/status, such as mod queue status (open/closed).
- `GET /queue?page=n` - fetches modding queue (50 entries). parameter `page` is optional and defaults to 0. contains events, beatmapset info and user info (requester and mapper).
- `GET /queue/:id` - fetches a single queue information. contains events, beatmapset info and user info (requester and mapper).
- `GET /queue/request_events/:requestId` - fetches events of mod request.
- `GET /queue/queues_small/:requestId` - fetches mod request but does not contain events, beatmapset info and user info.

### login required
- `GET /queue/me` (240 reqs/minute) - fetches modding queue that was submitted by you. returns all entries at once and contains events, beatmapset info and user info.
- `POST /queue/submit` - (1 req/minute) submits new mod request. the request will fail if user has already submitted the map in past 2 weeks.
- `POST /queue/edit_comment` (6 reqs/minute) - edits mapper/modder comment. if you're editing a mapper comment, you need to be requester. if you're editing a modder comment, you need to be modder/admin.
- `POST /queue/update_status` - updates mod request status. available only for modders/admins.
