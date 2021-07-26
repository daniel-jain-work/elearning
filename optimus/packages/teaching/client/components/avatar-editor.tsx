import { Slider, Typography } from '@material-ui/core';
import React from 'react';
import ReactAvatarEditor from 'react-avatar-editor';

interface Props {
  onImageChange: () => void;
  editorRef: React.RefObject<ReactAvatarEditor>;
}

interface State {
  scale: number;
  imageFile?: File;
}

export default class AvatarEditor extends React.PureComponent<Props, State> {
  state = { scale: 1, imageFile: undefined };

  handleScale = (e: React.ChangeEvent<any>, value: number | number[]) => {
    if (typeof value === 'number') {
      this.setState({ scale: value });
    }
  };

  handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const imageFile = e.target.files ? e.target.files[0] : undefined;
    this.setState({ imageFile });
    if (imageFile) {
      this.props.onImageChange();
    }
  };

  render() {
    const { imageFile, scale } = this.state;
    return (
      <div style={{ marginTop: 24, position: 'relative', maxWidth: 372 }}>
        {imageFile && (
          <>
            <ReactAvatarEditor
              ref={this.props.editorRef}
              image={imageFile}
              scale={scale}
              width={360}
              height={360}
              border={8}
              onImageChange={this.props.onImageChange}
            />

            <Slider
              value={scale}
              valueLabelDisplay="auto"
              onChange={this.handleScale}
              min={1}
              max={3}
              step={0.1}
            />
          </>
        )}

        <label>
          <Typography variant="subtitle2" color="textPrimary">
            Select a profile photo
          </Typography>
          <input type="file" accept="image/*" onChange={this.handleImage} />
        </label>
      </div>
    );
  }
}
