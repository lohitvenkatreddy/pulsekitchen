# Student ID Template

Place the reference college ID card image here as:

```txt
student_id_template.jpg
```

For safety, use a redacted/cropped sample that preserves the college ID card layout,
logo placement, colors, and major text blocks, but hides personal details.

You can also point the service to a different file:

```txt
STUDENT_ID_TEMPLATE_PATH=/path/to/student_id_template.jpg
```

By default, uploads are accepted only when the card layout match score is at
least `0.65`. You can override that if needed:

```txt
STUDENT_ID_MIN_MATCH_SCORE=0.65
```
