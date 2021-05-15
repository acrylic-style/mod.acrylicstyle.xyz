# [mod.acrylicstyle.xyz](https://mod.acrylicstyle.xyz)
mod queue site that has (almost) fully configurable rules, admin panel to manage user (like banning from using mod request system, or changing group) and more!

## Screenshots

![](https://user-images.githubusercontent.com/19150229/118348519-d5f7d980-b585-11eb-825e-ac02aa10d713.png)

### Admin Panel

![](https://user-images.githubusercontent.com/19150229/118348485-a2b54a80-b585-11eb-986b-0d09cedcf04f.png)

![](https://user-images.githubusercontent.com/19150229/118348506-c4163680-b585-11eb-9602-8af96450327f.png)

![](https://user-images.githubusercontent.com/19150229/118348525-ea3bd680-b585-11eb-8bce-245b1e387087.png)

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

### admin apis (undocumented)
these apis requires to be logged in as admin.

endpoint: `${APP_URL}/admin/api`

- `GET /status`
- `POST /rules_all`
- `POST /rules`
- `GET /max_difficulty`
- `POST /save_user`

## License
See LICENSE file. [tl;dr](https://tldrlegal.com/license/mit-license)
