from .processor import SimpleProcessor
from langchain.document_loaders import YoutubeLoader

from .processor_type_name_utils import YOUTUBE_TRANSCRIPT_INPUT

class YoutubeTranscriptInputProcessor(SimpleProcessor):
    processor_type = YOUTUBE_TRANSCRIPT_INPUT

    def __init__(self, config):
        super().__init__(config)
        self.url = config["url"]
        self.language = config["language"]

    def updateContext(self, data):
        pass

    def process(self):
        loader = YoutubeLoader.from_youtube_url(
            self.url,
            add_video_info=True,
            language=self.language,
        )

        documents = loader.load()
        content = " ".join(doc.page_content for doc in documents)
        self.set_output(content)
        return content
